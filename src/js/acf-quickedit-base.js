(function( $, exports ){
	exports.acf_quickedit = qe = {
		form:{},
		field: {
			_types: {},// field types
			add_type:function(a) {
				qe.field._types[a.type] = qe.field.View.extend(a);
				return qe.field._types[a.type];
			},
			factory:function(el,controller){
				var type = $(el).attr('data-field-type'),
					types = qe.field._types;

				field_class = type in types ? types[type] : qe.field.View;
				return new field_class({
					el:			el,
					controller:	controller,
				});
			}
		},

	};




	qe.form.View = Backbone.View.extend({
		initialize:function(){

			var self = this;

			this.options = arguments[0];

			Backbone.View.prototype.initialize.apply( this, arguments );

			this.fields = {};

			this.$('.inline-edit-col-qed [data-key]').each(function(i,el){
				var field = qe.field.factory( el, this );
				self.fields[ field.key ] = field;
			});
			// load values
			this.loadValues();

		},
		loadValues: function() {
			var self = this;
			$.post({
				url:ajaxurl,
				data:{
					'action' : 'get_acf_post_meta',
					'object_id' : this.options.object_id,
					'acf_field_keys' : Object.keys(this.fields)
				},
				success:function(response){
					self.loadedValues( response );
				}
			});

			return this;
		},
		loadedValues:function(values) {
			var self = this;
			_.each(values,function( val, key ){
				self.fields[key].setValue( val );
			});
			this.initValidation();
		},
		unload:function(e){
			_.each(this.fields,function(field){
				field.unload();
			});
		},
		validationComplete:function( json, $form ) {
			console.log(json);
			var self = this;

			if ( ! json.valid ) {
				_.each(json.errors,function(err){
					// err.input is in format `acf[<FIELD_KEY>]`
					var key = err.input.replace(/^acf\[([0-9a-z_]+)\]$/g,'$1');
					if ( key in self.fields ) {
						self.fields[key].setError( err.message );
					}
				});
			}
			return json;
		},
		initValidation:function() {
			var $form = this.$el.closest('form'),
				$button = $form.find('button.save');

			acf.update('post_id', this.options.object_id );

			acf.add_filter( 'validation_complete', this.validationComplete, 10, this );
//			acf.add_action('validation_failure', this.validationFailure );

			$button.click( function(e) {
				// bail early if not active
				if( !acf.validation.active ) {

					return true;

				}

				// ignore validation (only ignore once)
				if( acf.validation.ignore ) {
					acf.validation.ignore = 0;
					return true;
				}

				// stop WP JS validation
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();


				// store submit trigger so it will be clicked if validation is passed
				acf.validation.$trigger = $(this);

				// run validation
				acf.validation.fetch( $form );

				// stop all other click events on this input
				return false;
			});
			// move our events handler to front
			$._data($button[0],'events').click.reverse()
		}
	});
	qe.form.QuickEdit = qe.form.View.extend({

	});

	qe.form.BulkEdit = qe.form.View.extend({
		// todo: do not change
	});



	qe.field.View = wp.media.View.extend({
		initialize:function(){
			var self = this;
			Backbone.View.prototype.initialize.apply( this, arguments );
			this.key = this.$el.attr('data-key');

			if ( ! this.$input ) {
				this.$input = this.$('input')
			}
			this.$input.prop( 'readonly', true );
			this.$('*').on('change',function(){self.resetError()})
		},
		setValue:function(value){
			this.$input.prop( 'readonly', false );
			this.$input.val(value);
			return this;
		},
		setError:function(message) {
			this.$el.attr('data-error-message',message);
			return this;
		},
		resetError:function() {
			this.$el.removeAttr( 'data-error-message' );
			return this;
		},
		unload:function(){}
	});


})(jQuery,window);